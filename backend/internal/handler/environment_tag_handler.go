package handler

import (
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/service"
	"strconv"
)

type EnvironmentTagHandler struct {
	service *service.EnvironmentTagService
}

func NewEnvironmentTagHandler(service *service.EnvironmentTagService) *EnvironmentTagHandler {
	return &EnvironmentTagHandler{service: service}
}

func (h *EnvironmentTagHandler) GetAll(c *fiber.Ctx) error {
	tags, err := h.service.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(tags)
}

func (h *EnvironmentTagHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid tag ID"})
	}
	
	tag, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if tag == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Environment tag not found"})
	}
	return c.JSON(tag)
}

func (h *EnvironmentTagHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateEnvironmentTagRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}
	
	tag, err := h.service.Create(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(201).JSON(tag)
}

func (h *EnvironmentTagHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid tag ID"})
	}
	
	var req domain.UpdateEnvironmentTagRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	tag, err := h.service.Update(id, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(tag)
}

func (h *EnvironmentTagHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid tag ID"})
	}
	
	if err := h.service.Delete(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(204).Send(nil)
}

func (h *EnvironmentTagHandler) AssignTagsToClusters(c *fiber.Ctx) error {
	var req domain.AssignTagsToClustersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if len(req.ClusterIDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "cluster_ids is required"})
	}
	if len(req.TagIDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "tag_ids is required"})
	}
	
	if err := h.service.AssignTagsToClusters(req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"message": "Tags assigned successfully"})
}

func (h *EnvironmentTagHandler) RemoveTagsFromClusters(c *fiber.Ctx) error {
	var req domain.RemoveTagsFromClustersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if len(req.ClusterIDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "cluster_ids is required"})
	}
	if len(req.TagIDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "tag_ids is required"})
	}
	
	if err := h.service.RemoveTagsFromClusters(req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"message": "Tags removed successfully"})
}

func (h *EnvironmentTagHandler) GetTagsByClusterID(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("clusterId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	tags, err := h.service.GetTagsByClusterID(clusterID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(tags)
}

