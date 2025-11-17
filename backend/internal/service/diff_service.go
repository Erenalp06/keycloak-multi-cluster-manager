package service

import (
	"reflect"
	"keycloak-multi-manage/internal/domain"
)

type DiffService struct {
	roleService    *RoleService
	clusterService *ClusterService
}

func NewDiffService(roleService *RoleService, clusterService *ClusterService) *DiffService {
	return &DiffService{
		roleService:    roleService,
		clusterService: clusterService,
	}
}

func (s *DiffService) GetRoleDiff(sourceClusterID, destinationClusterID int) ([]domain.RoleDiff, error) {
	sourceRoles, err := s.roleService.GetRoles(sourceClusterID)
	if err != nil {
		return nil, err
	}
	
	destinationRoles, err := s.roleService.GetRoles(destinationClusterID)
	if err != nil {
		return nil, err
	}
	
	// Create maps for quick lookup
	sourceRoleMap := make(map[string]domain.Role)
	destRoleMap := make(map[string]domain.Role)
	
	for _, role := range sourceRoles {
		sourceRoleMap[role.Name] = role
	}
	for _, role := range destinationRoles {
		destRoleMap[role.Name] = role
	}
	
	var diffs []domain.RoleDiff
	
	// Find roles that exist in source but not in destination
	for _, role := range sourceRoles {
		if _, exists := destRoleMap[role.Name]; !exists {
			diffs = append(diffs, domain.RoleDiff{
				Role:        role,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_destination",
				Side:        "source",
			})
		}
	}
	
	// Find roles that exist in destination but not in source
	for _, role := range destinationRoles {
		if _, exists := sourceRoleMap[role.Name]; !exists {
			diffs = append(diffs, domain.RoleDiff{
				Role:        role,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_source",
				Side:        "destination",
			})
		}
	}
	
	return diffs, nil
}

func (s *DiffService) GetClientDiff(sourceClusterID, destinationClusterID int) ([]domain.ClientDiff, error) {
	sourceClients, err := s.clusterService.GetClientDetails(sourceClusterID)
	if err != nil {
		return nil, err
	}
	
	destinationClients, err := s.clusterService.GetClientDetails(destinationClusterID)
	if err != nil {
		return nil, err
	}
	
	// Create a map of destination clients by ClientID
	destClientMap := make(map[string]domain.ClientDetail)
	for _, client := range destinationClients {
		destClientMap[client.ClientID] = client
	}
	
	var diffs []domain.ClientDiff
	
	// Create source client map
	sourceClientMap := make(map[string]domain.ClientDetail)
	for _, client := range sourceClients {
		sourceClientMap[client.ClientID] = client
	}
	
	// Check source clients
	for _, sourceClient := range sourceClients {
		destClient, exists := destClientMap[sourceClient.ClientID]
		
		if !exists {
			// Client missing in destination
			diffs = append(diffs, domain.ClientDiff{
				Client:      sourceClient,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_destination",
				Side:        "source",
			})
		} else {
			// Compare configurations
			differences, sourceVals, destVals := compareClientConfigsDetailed(sourceClient, destClient)
			if len(differences) > 0 {
				diffs = append(diffs, domain.ClientDiff{
					Client:          sourceClient,
					Source:          "source",
					Destination:     "destination",
					Status:          "different_config",
					Side:            "both",
					Differences:     differences,
					SourceValue:     sourceVals,
					DestinationValue: destVals,
				})
			}
		}
	}
	
	// Check destination clients (find ones missing in source)
	for _, destClient := range destinationClients {
		if _, exists := sourceClientMap[destClient.ClientID]; !exists {
			diffs = append(diffs, domain.ClientDiff{
				Client:      destClient,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_source",
				Side:        "destination",
			})
		}
	}
	
	return diffs, nil
}

func compareClientConfigs(source, dest domain.ClientDetail) []string {
	differences, _, _ := compareClientConfigsDetailed(source, dest)
	return differences
}

func compareClientConfigsDetailed(source, dest domain.ClientDetail) ([]string, map[string]interface{}, map[string]interface{}) {
	var differences []string
	sourceVals := make(map[string]interface{})
	destVals := make(map[string]interface{})
	
	if source.Protocol != dest.Protocol {
		differences = append(differences, "protocol")
		sourceVals["protocol"] = source.Protocol
		destVals["protocol"] = dest.Protocol
	}
	if !equalStringSlices(source.RedirectUris, dest.RedirectUris) {
		differences = append(differences, "redirectUris")
		sourceVals["redirectUris"] = source.RedirectUris
		destVals["redirectUris"] = dest.RedirectUris
	}
	if !equalStringSlices(source.WebOrigins, dest.WebOrigins) {
		differences = append(differences, "webOrigins")
		sourceVals["webOrigins"] = source.WebOrigins
		destVals["webOrigins"] = dest.WebOrigins
	}
	if source.PublicClient != dest.PublicClient {
		differences = append(differences, "accessType")
		sourceVals["publicClient"] = source.PublicClient
		destVals["publicClient"] = dest.PublicClient
	}
	if source.BearerOnly != dest.BearerOnly {
		differences = append(differences, "accessType")
		sourceVals["bearerOnly"] = source.BearerOnly
		destVals["bearerOnly"] = dest.BearerOnly
	}
	if source.DirectAccessGrantsEnabled != dest.DirectAccessGrantsEnabled {
		differences = append(differences, "directAccessGrantsEnabled")
		sourceVals["directAccessGrantsEnabled"] = source.DirectAccessGrantsEnabled
		destVals["directAccessGrantsEnabled"] = dest.DirectAccessGrantsEnabled
	}
	if source.ServiceAccountsEnabled != dest.ServiceAccountsEnabled {
		differences = append(differences, "serviceAccountsEnabled")
		sourceVals["serviceAccountsEnabled"] = source.ServiceAccountsEnabled
		destVals["serviceAccountsEnabled"] = dest.ServiceAccountsEnabled
	}
	if !equalStringSlices(source.DefaultClientScopes, dest.DefaultClientScopes) {
		differences = append(differences, "defaultClientScopes")
		sourceVals["defaultClientScopes"] = source.DefaultClientScopes
		destVals["defaultClientScopes"] = dest.DefaultClientScopes
	}
	if !equalStringSlices(source.OptionalClientScopes, dest.OptionalClientScopes) {
		differences = append(differences, "optionalClientScopes")
		sourceVals["optionalClientScopes"] = source.OptionalClientScopes
		destVals["optionalClientScopes"] = dest.OptionalClientScopes
	}
	
	return differences, sourceVals, destVals
}

func (s *DiffService) GetGroupDiff(sourceClusterID, destinationClusterID int) ([]domain.GroupDiff, error) {
	sourceGroups, err := s.clusterService.GetGroupDetails(sourceClusterID)
	if err != nil {
		return nil, err
	}
	
	destinationGroups, err := s.clusterService.GetGroupDetails(destinationClusterID)
	if err != nil {
		return nil, err
	}
	
	// Create a map of destination groups by path
	destGroupMap := make(map[string]domain.GroupDetail)
	for _, group := range destinationGroups {
		destGroupMap[group.Path] = group
	}
	
	var diffs []domain.GroupDiff
	
	// Create source group map
	sourceGroupMap := make(map[string]domain.GroupDetail)
	for _, group := range sourceGroups {
		sourceGroupMap[group.Path] = group
	}
	
	// Check source groups
	for _, sourceGroup := range sourceGroups {
		destGroup, exists := destGroupMap[sourceGroup.Path]
		
		if !exists {
			// Group missing in destination
			diffs = append(diffs, domain.GroupDiff{
				Group:       sourceGroup,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_destination",
				Side:        "source",
			})
		} else {
			// Compare configurations
			differences, sourceVals, destVals := compareGroupConfigsDetailed(sourceGroup, destGroup)
			if len(differences) > 0 {
				diffs = append(diffs, domain.GroupDiff{
					Group:           sourceGroup,
					Source:          "source",
					Destination:     "destination",
					Status:          "different_config",
					Side:            "both",
					Differences:     differences,
					SourceValue:     sourceVals,
					DestinationValue: destVals,
				})
			}
		}
	}
	
	// Check destination groups (find ones missing in source)
	for _, destGroup := range destinationGroups {
		if _, exists := sourceGroupMap[destGroup.Path]; !exists {
			diffs = append(diffs, domain.GroupDiff{
				Group:       destGroup,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_source",
				Side:        "destination",
			})
		}
	}
	
	return diffs, nil
}

func compareGroupConfigs(source, dest domain.GroupDetail) []string {
	differences, _, _ := compareGroupConfigsDetailed(source, dest)
	return differences
}

func compareGroupConfigsDetailed(source, dest domain.GroupDetail) ([]string, map[string]interface{}, map[string]interface{}) {
	var differences []string
	sourceVals := make(map[string]interface{})
	destVals := make(map[string]interface{})
	
	if !equalStringSlices(source.RealmRoles, dest.RealmRoles) {
		differences = append(differences, "realmRoles")
		sourceVals["realmRoles"] = source.RealmRoles
		destVals["realmRoles"] = dest.RealmRoles
	}
	if !equalClientRoles(source.ClientRoles, dest.ClientRoles) {
		differences = append(differences, "clientRoles")
		sourceVals["clientRoles"] = source.ClientRoles
		destVals["clientRoles"] = dest.ClientRoles
	}
	if !equalAttributes(source.Attributes, dest.Attributes) {
		differences = append(differences, "attributes")
		sourceVals["attributes"] = source.Attributes
		destVals["attributes"] = dest.Attributes
	}
	
	return differences, sourceVals, destVals
}

func (s *DiffService) GetUserDiff(sourceClusterID, destinationClusterID int) ([]domain.UserDiff, error) {
	sourceUsers, err := s.clusterService.GetUserDetails(sourceClusterID)
	if err != nil {
		return nil, err
	}
	
	destinationUsers, err := s.clusterService.GetUserDetails(destinationClusterID)
	if err != nil {
		return nil, err
	}
	
	// Create a map of destination users by username
	destUserMap := make(map[string]domain.UserDetail)
	for _, user := range destinationUsers {
		destUserMap[user.Username] = user
	}
	
	var diffs []domain.UserDiff
	
	// Create source user map
	sourceUserMap := make(map[string]domain.UserDetail)
	for _, user := range sourceUsers {
		sourceUserMap[user.Username] = user
	}
	
	// Check source users
	for _, sourceUser := range sourceUsers {
		destUser, exists := destUserMap[sourceUser.Username]
		
		if !exists {
			// User missing in destination
			diffs = append(diffs, domain.UserDiff{
				User:        sourceUser,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_destination",
				Side:        "source",
			})
		} else {
			// Compare configurations
			differences, sourceVals, destVals := compareUserConfigsDetailed(sourceUser, destUser)
			if len(differences) > 0 {
				diffs = append(diffs, domain.UserDiff{
					User:            sourceUser,
					Source:          "source",
					Destination:     "destination",
					Status:          "different_config",
					Side:            "both",
					Differences:     differences,
					SourceValue:     sourceVals,
					DestinationValue: destVals,
				})
			}
		}
	}
	
	// Check destination users (find ones missing in source)
	for _, destUser := range destinationUsers {
		if _, exists := sourceUserMap[destUser.Username]; !exists {
			diffs = append(diffs, domain.UserDiff{
				User:        destUser,
				Source:      "source",
				Destination: "destination",
				Status:      "missing_in_source",
				Side:        "destination",
			})
		}
	}
	
	return diffs, nil
}

func compareUserConfigs(source, dest domain.UserDetail) []string {
	differences, _, _ := compareUserConfigsDetailed(source, dest)
	return differences
}

func compareUserConfigsDetailed(source, dest domain.UserDetail) ([]string, map[string]interface{}, map[string]interface{}) {
	var differences []string
	sourceVals := make(map[string]interface{})
	destVals := make(map[string]interface{})
	
	if !equalStringSlices(source.RealmRoles, dest.RealmRoles) {
		differences = append(differences, "realmRoles")
		sourceVals["realmRoles"] = source.RealmRoles
		destVals["realmRoles"] = dest.RealmRoles
	}
	if !equalClientRoles(source.ClientRoles, dest.ClientRoles) {
		differences = append(differences, "clientRoles")
		sourceVals["clientRoles"] = source.ClientRoles
		destVals["clientRoles"] = dest.ClientRoles
	}
	if !equalStringSlices(source.Groups, dest.Groups) {
		differences = append(differences, "groups")
		sourceVals["groups"] = source.Groups
		destVals["groups"] = dest.Groups
	}
	if !equalAttributes(source.Attributes, dest.Attributes) {
		differences = append(differences, "attributes")
		sourceVals["attributes"] = source.Attributes
		destVals["attributes"] = dest.Attributes
	}
	if !equalStringSlices(source.RequiredActions, dest.RequiredActions) {
		differences = append(differences, "requiredActions")
		sourceVals["requiredActions"] = source.RequiredActions
		destVals["requiredActions"] = dest.RequiredActions
	}
	
	return differences, sourceVals, destVals
}

// Helper functions
func equalStringSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	
	// Create maps for comparison
	mapA := make(map[string]bool)
	mapB := make(map[string]bool)
	
	for _, v := range a {
		mapA[v] = true
	}
	for _, v := range b {
		mapB[v] = true
	}
	
	return reflect.DeepEqual(mapA, mapB)
}

func equalClientRoles(a, b map[string][]string) bool {
	if len(a) != len(b) {
		return false
	}
	
	for k, v := range a {
		if !equalStringSlices(v, b[k]) {
			return false
		}
	}
	
	return true
}

func equalAttributes(a, b map[string][]string) bool {
	if len(a) != len(b) {
		return false
	}
	
	for k, v := range a {
		if !equalStringSlices(v, b[k]) {
			return false
		}
	}
	
	return true
}

